# -*- mode: ruby -*-
# # vi: set ft=ruby :

$num_instances = 2
$instance_name_prefix = "core"

Vagrant.configure("2") do |config|
  
  config.vm.box = "ubuntu/xenial64"

  (1..$num_instances).each do |i|
    config.vm.define vm_name = "%s-%02d" % [$instance_name_prefix, i] do |config|
      config.vm.hostname = vm_name

      ip = "172.17.8.#{i+100}"
      config.vm.network "private_network", ip: ip
      # config.ssh.host = ip
      if $expose_docker_tcp
        config.vm.network "forwarded_port", guest: 2375, host: ($expose_docker_tcp + i - 1), auto_correct: true
      end
      
      config.vm.network "forwarded_port", guest: 7777, host: 7777, auto_correct: true
      config.vm.network "forwarded_port", guest: 27017, host: 27017, auto_correct: true

    end
  end
end
